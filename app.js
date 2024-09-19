const express = require("express");
const cors = require('cors');
const bodyParser = require('body-parser');
const port = 3200;
const path = require('path');
const router = require("./src/loaders/routes");
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger/swagger-output.json')
const app = express();
const helmet = require('helmet');

app.use(cors({
  origin: 'localhost:3000',
  methods: ['POST', 'PUT', 'GET', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Origin', 'Content-Type', 'Accept', 'token'],
}))
const cspOptions = {
	directives: {
		...helmet.contentSecurityPolicy.getDefaultDirectives(),
		"default-src" : ["'self'"],
		"script-src" : ["'self'"],
		"img-src" : ["'self'", "data:"],
    "base-uri" : ["/","http:"]
	}
}
app.use(helmet({
  contentSecurityPolicy: cspOptions,
}));
app.use('/file', express.static(path.join(__dirname, 'file')));
app.use(express.static(path.join(__dirname, 'react/build')));
app.use(bodyParser.json({limit: '200mb'}));
app.use(bodyParser.urlencoded({limit: '200mb', extended: true, parameterLimit: 1000000}));
app.use(router);

// 에러처리 미들웨어
app.use((err, req, res, next) => {
  console.log(err);
  return res.json({
      resultCode : 413,
      resultMsg : err.toString()
  });
});

// 개발서버 포트
app.set('port', process.env.PORT || port);
//swagger 모듈 호출하기
app.use("/das-sdl-swagger", swaggerUi.serve, swaggerUi.setup(swaggerFile, {explorer : true}));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '/react/build/index.html'));
});

app.listen(port, () => {
  console.log("Server Start...." + port);
});