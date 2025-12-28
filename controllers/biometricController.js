const SimpleWebAuthnServer = require('@simplewebauthn/server');
const HostlerCredentials = require('../models/HostlerCredentials');
const Hostelers = require('../models/Hostelers'); // Assuming you might need to check if user exists

// Relying Party (RP) Configuration
const rpName = 'Hostel Management App';
const rpID = process.env.RP_ID || 'localhost';
const origin = process.env.CLIENT_URL || `http://${rpID}:5173`;

const store = {}; // Temporary in-memory store for challenges. In production, use Redis/DB.

// Registration: Generate Options
exports.generateRegistrationOptions = async (req, res) => {
    try {
        const { rollNo } = req.body;
        const user = await HostlerCredentials.findOne({ rollNo });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get existing credentials to prevent re-registration
        const userAuthenticators = user.biometricCredentials || [];

        const options = await SimpleWebAuthnServer.generateRegistrationOptions({
            rpName,
            rpID,
            userID: new Uint8Array(Buffer.from(user._id.toString())), // Convert to Uint8Array
            userName: user.rollNo,
            attestationType: 'none', // 'none' is recommended for privacy
            excludeCredentials: userAuthenticators.map(auth => ({
                id: auth.credentialID,
                type: 'public-key',
                transports: auth.transports,
            })),
            authenticatorSelection: {
                residentKey: 'preferred',
                userVerification: 'required', // Prefer biometric verification
                authenticatorAttachment: 'platform', // Use platform authenticator (TouchID/FaceID)
            },
        });

        // Save challenge temporarily
        store[rollNo] = { challenge: options.challenge };

        res.json(options);
    } catch (error) {
        console.error('Generate Registration Options Error:', error);
        res.status(500).json({ error: error.message, stack: error.stack });
    }
};

// Registration: Verify Response
exports.verifyRegistration = async (req, res) => {
    try {
        const { rollNo, response } = req.body;
        const user = await HostlerCredentials.findOne({ rollNo });
        const expectedChallenge = store[rollNo]?.challenge;

        if (!expectedChallenge) {
            return res.status(400).json({ error: 'Challenge expired or invalid' });
        }

        const verification = await SimpleWebAuthnServer.verifyRegistrationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
        });

        const { verified, registrationInfo } = verification;

        if (verified && registrationInfo) {
            const newCredential = {
                credentialID: registrationInfo.credentialID,
                credentialPublicKey: registrationInfo.credentialPublicKey,
                counter: registrationInfo.counter,
                transports: response.response.transports,
            };

            user.biometricCredentials = user.biometricCredentials || [];
            user.biometricCredentials.push(newCredential);
            await user.save();

            delete store[rollNo]; // Cleanup challenge
            res.json({ verified: true });
        } else {
            res.status(400).json({ verified: false, error: 'Verification failed' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Login: Generate Options
exports.generateAuthenticationOptions = async (req, res) => {
    try {
        const { rollNo } = req.body;
        const user = await HostlerCredentials.findOne({ rollNo });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userAuthenticators = user.biometricCredentials || [];

        const options = await SimpleWebAuthnServer.generateAuthenticationOptions({
            rpID,
            userVerification: 'required', // Require biometric
            allowCredentials: userAuthenticators.map(auth => ({
                id: auth.credentialID,
                type: 'public-key',
                transports: auth.transports,
            })),
        });

        store[rollNo] = { challenge: options.challenge };

        res.json(options);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Login: Verify Response
exports.verifyAuthentication = async (req, res) => {
    try {
        const { rollNo, response } = req.body;
        const user = await HostlerCredentials.findOne({ rollNo });
        const expectedChallenge = store[rollNo]?.challenge;

        if (!user || !expectedChallenge) {
            return res.status(400).json({ error: 'Invalid request' });
        }

        const authenticator = user.biometricCredentials.find(
            cre => cre.credentialID === response.id
        );

        if (!authenticator) {
            return res.status(400).json({ error: 'Authenticator not registered' });
        }

        const verification = await SimpleWebAuthnServer.verifyAuthenticationResponse({
            response,
            expectedChallenge,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: {
                credentialID: authenticator.credentialID,
                credentialPublicKey: new Uint8Array(authenticator.credentialPublicKey.buffer), // Ensure Uint8Array
                counter: authenticator.counter,
                transports: authenticator.transports,
            },
        });

        const { verified, authenticationInfo } = verification;

        if (verified) {
            // Update counter
            authenticator.counter = authenticationInfo.newCounter;
            await user.save();

            delete store[rollNo];
            res.json({ verified: true });
        } else {
            res.status(400).json({ verified: false });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
