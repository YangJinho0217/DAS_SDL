const mapper = require("mybatis-mapper");

mapper.createMapper([
  "./src/mapper/user.xml",
  "./src/mapper/comm.xml",
  "./src/mapper/prj.xml",
  "./src/mapper/prc.xml"
]);

module.exports = mapper;
