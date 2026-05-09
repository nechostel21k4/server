const express = require('express');
const router = express.Router();
const requestsController = require('../controllers/requestsController');
const { authenticateUser, isIncharge, isFaculty } = require('../middleware/auth')

router.post('/', authenticateUser, requestsController.createRequest);
router.get('/pending/:hostelId', authenticateUser, isIncharge, requestsController.getPendingRequestsByHostelId); 
router.post('/approve/:Id', authenticateUser, isIncharge, requestsController.approveRequest); 

router.get('/activeRequest/:hostelId', authenticateUser, isIncharge, requestsController.acceptedRequestsByHostelId) 
router.post('/arrive/:Id', authenticateUser, isIncharge, requestsController.arriveRequest); 
router.post('/getArrivedRequests/:hostelId', authenticateUser, isFaculty, requestsController.getArrivedRequestsBetweenDates)
router.post("/getAcceptedRequests/:hostelId", authenticateUser, isFaculty, requestsController.getAcceptedRequestsBetweenDates);
router.get('/getTodayrequests/:hostelId', authenticateUser, isIncharge, requestsController.getTodayRequestCountsByHostelId) 

router.get('/getTodayAcceptedRequests/:hostelId', authenticateUser, isIncharge, requestsController.getTodayAcceptedByHostelId) 
router.get('/getTodayArrivedRequests/:hostelId', authenticateUser, isIncharge, requestsController.getTodayArrivedByHostelId)  


router.get('/verify/:id', authenticateUser, isFaculty, requestsController.verifyRequest);
router.post('/cancel/:Id', authenticateUser, requestsController.CancelRequestById); 

router.get('/:RollNo', authenticateUser, requestsController.getAllRequestsByRollNumber);

module.exports = router;
