const Incharge = require('../models/Incharge');
const { forgotPassword } = require('./inchargeLoginController'); 
const { createInchargeLogin }= require('./inchargeLoginController');
const { deleteInchargeLogin } = require('./inchargeLoginController');

// CREATE SECTION
// Create an incharge
exports.createIncharge = async (req, res) => {
    try {
        const { hostelId, name, phoneNo, eid, designation, password } = req.body;

        const existingIncharge = await Incharge.findOne({ eid });
        if (existingIncharge) {
            return res.json({ isExisted: true, success: false, message: `Incharge with eid ${eid} already exists.` });
        }

        // Step 1: Create the incharge
        const newIncharge = new Incharge({
            hostelId,
            name,
            phoneNo,
            eid,
            designation
        });

        await newIncharge.save();

        // Step 2: Create the incharge login
        const loginResponse = await createInchargeLogin(req);

        if (!loginResponse.success) {
            // Rollback: Delete the incharge if creating the login failed
            await Incharge.findOneAndDelete({ eid });
            return res.json({
                success: false,
                message: 'Failed to create incharge login. Incharge creation rolled back.',
                error: loginResponse.message,
            });
        }

        res.json({ isExisted: false, success: true, message:"Successfully Incharge Created" });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Verify a incharge and trigger forgot password functionality
exports.verifyIncharge = async (req,res) =>{

    try {

        // Check if the Incharge exists
        const incharge = await Incharge.findOne({ eid: req.params.eid });

        if (!incharge) {
            return res.json({ isExist:false,message: `Incharge with eid ${req.params.eid} not found.` });
        }

        const {phoneNo,otp} = await forgotPassword(incharge);

        res.status(200).json({ isExist:true,phoneNo, message: 'Forgot password process initiated. OTP sent.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


//GET SECTION
// Get all incharges
exports.getAllIncharges = async (req, res) => {
    try {
        const incharges = await Incharge.find();
        res.status(200).json(incharges);
    } catch (error) {
        res.json({ message: error.message });
    }
};

exports.getInchargesByHostelId = async (req, res) => {
    try {
        const { hostelId } = req.params;
        
        if (!hostelId) {
            return res.status(400).json({ message: 'Hostel ID is required' });
        }

        let incharges
        if(hostelId.toUpperCase()=="ALL"){
             incharges = await Incharge.find();
        }
        else{
             incharges = await Incharge.find({ hostelId });
        }

        res.status(200).json({ incharges });
    } catch (error) {

        res.status(500).json({ message: 'Server error' });
    }
};
// Get an incharge by eid
exports.getInchargeByEid = async (req, res) => {
    try {
        const incharge = await Incharge.findOne({ eid: req.params.eid });
        if (!incharge) {
            return res.status(404).json({ message: `Incharge with eid ${req.params.eid} not found.` });
        }
        res.status(200).json(incharge);
    } catch (error) {
        res.json({ message: error.message });
    }
};



// Update an incharge by eid
exports.updateInchargeByEid = async (req, res) => {
    try {
        const { eid } = req.params;
        const update = req.body;

        const updatedIncharge = await Incharge.findOneAndUpdate(
            { eid },
            update,
            { new: true }
        );

        if (!updatedIncharge) {
            return res.status(404).json({ message: `Incharge with eid ${eid} not found.` });
        }

        res.status(200).json({updated:true});
    } catch (error) {
        res.json({ message: error.message });
    }
};



// Delete an incharge by eid
exports.deleteInchargeByEid = async (req, res) => {
    try {
        const { eid } = req.params;

        const deletedIncharge = await Incharge.findOneAndDelete({ eid });

        if (!deletedIncharge) {
            return res.status(404).json({ message: `Incharge with eid ${eid} not found.` });
        }

        // Call deleteInchargeLogin 
        const deleteLoginResponse = await deleteInchargeLogin(req);

        if (!deleteLoginResponse.deleted) {
            return res.status(500).json({ deleted: false, message: deleteLoginResponse.message });
        }

        res.status(200).json({ deleted: true, message: `Incharge with eid ${eid} deleted successfully.` });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

