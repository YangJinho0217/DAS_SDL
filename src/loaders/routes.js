const express = require("express");
const router = express.Router();

/* router path */
const user = require("../api/user");
const prj = require("../api/prj");
const prc = require("../api/prc");
const comm = require('../api/comm')

router.use("/das/user", user);
router.use("/das/prj", prj);
router.use("/das/prc", prc);
router.use('/das/comm', comm);

module.exports = router;
