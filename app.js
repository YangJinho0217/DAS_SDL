const express = require("express");
const cors = require('cors');
const bodyParser = require('body-parser');
const port = 3200;

const router = require("./src/loaders/routes");
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger/swagger-output.json')
const app = express();

app.use(cors({
  origin: 'localhost:3000',
  methods: ['POST', 'PUT', 'GET', 'OPTIONS', 'HEAD'],
}))

app.use(bodyParser.json({limit: '200mb'}));
app.use(bodyParser.urlencoded({limit: '200mb', extended: true, parameterLimit: 1000000}));
app.use(router);

// 개발서버 포트
app.set('port', process.env.PORT || port);

//swagger 모듈 호출하기
app.use("/das-sdl-swagger", swaggerUi.serve, swaggerUi.setup(swaggerFile, {explorer : true}));

app.get("/", (req, res) => {
  res.send("BackEnd Server index Page");
});

app.listen(port, () => {
  console.log("Server Start...." + port);
});