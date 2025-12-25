const axios = require('axios');

async function checkApi() {
    try {
        console.log("Fetching student data...");
        // Assuming no auth middleware for the moment or I need a token.
        // Wait, the route is protected: router.get('/:RollNo', authenticateUser, ...);
        // I need a token. I can simulate a login first.

        const loginRes = await axios.post('http://localhost:5000/student-auth/login', {
            rollNo: '22471A05M6',
            password: 'password123' // I hope this is the password, or I can bypass auth in code for a sec? 
            // Better to temporarily bypass auth in the route if I don't know the password.
            // Or I can use the existing backend code to generate a token manually.
        });

        const token = loginRes.data.token;
        console.log("Got Token:", token ? "Yes" : "No");

        const res = await axios.get('http://localhost:5000/student/22471A05M6', {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log("\n--- API RESPONSE ---");
        console.log("isExist:", res.data.isExist);
        console.log("hosteler.isRegistered:", res.data.hosteler ? res.data.hosteler.isRegistered : 'hosteler object missing');
        console.log("Full Student Object Keys:", Object.keys(res.data.hosteler || {}));

    } catch (err) {
        console.error("Error:", err.message);
        if (err.response) console.error("Data:", err.response.data);
    }
}

checkApi();
