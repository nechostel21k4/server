const express = require('express');
const router = express.Router();
const requestsController = require('../controllers/requestsController');
const authenticateUser = require('../middleware/auth')

router.post('/', requestsController.createRequest);//creating new request leave or permisssion
router.get('/pending/:hostelId',authenticateUser, requestsController.getPendingRequestsByHostelId); //get pending requests(ALL or By hostelId)
router.post('/approve/:Id',authenticateUser, requestsController.approveRequest); //approve a request accept or reject

router.get('/activeRequest/:hostelId',authenticateUser,requestsController.acceptedRequestsByHostelId) //get active requests(ALL or By hostelId)
router.post('/arrive/:Id',authenticateUser, requestsController.arriveRequest); //arriving,chage the state to arrive and notify the student
router.post('/getArrivedRequests/:hostelId',authenticateUser,requestsController.getArrivedRequestsBetweenDates)//get arrive or completed requests (ALL or hostelId)
router.post("/getAcceptedRequests/:hostelId",authenticateUser ,requestsController.getAcceptedRequestsBetweenDates);//get accepted or completed requests (ALL or hostelId)
router.get('/getTodayrequests/:hostelId',requestsController.getTodayRequestCountsByHostelId) //getting today requests by hostelId

router.get('/getTodayAcceptedRequests/:hostelId',authenticateUser ,requestsController.getTodayAcceptedByHostelId) //getting today accepted requests by hostelId
router.get('/getTodayArrivedRequests/:hostelId',authenticateUser ,requestsController.getTodayArrivedByHostelId)  //getting today arrived requests by hostelId


router.get('/:RollNo',requestsController.getAllRequestsByRollNumber);

router.post('/cancel/:Id',authenticateUser, requestsController.CancelRequestById); //cancel a request


module.exports = router;
