const express = require("express");
const cors = require('cors');
const bodyParser = require('body-parser');
const port = 3200;
const path = require('path');

const router = require("./src/loaders/routes");
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger/swagger-output.json')
const app = express();

app.use(cors({
  origin: 'localhost:3000',
  methods: ['POST', 'PUT', 'GET', 'OPTIONS', 'HEAD' ,'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'token'],
}))

app.use('/file', express.static(path.join(__dirname, 'file')));
app.use(express.static(path.join(__dirname, 'react/build')));
app.use(bodyParser.json({limit: '200mb'}));
app.use(bodyParser.urlencoded({limit: '200mb', extended: true, parameterLimit: 1000000}));
app.use(router);

// 개발서버 포트
app.set('port', process.env.PORT || port);

//swagger 모듈 호출하기
app.use("/das-sdl-swagger", swaggerUi.serve, swaggerUi.setup(swaggerFile, {explorer : true}));
// app.get("/", function(req, res) {
//   // res.send("BackEnd Server index Page");
//   res.sendFile(path.join(__dirname, '/react/build/index.html'))
// });

// 모든 요청을 index.html로 리다이렉트
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '/react/build/index.html'));
});

app.listen(port, () => {
  console.log("Server Start...." + port);
});