const swaggerAutogen = require('swagger-autogen')();

const doc = {
    info: {
        title: 'Video Api',
        description: 'Video Management for Mobile Streaming',
    },
    schemes: ['http', 'https']
};

const outputFile = './swagger-output.json';
const endpointsFiles = ['./routes/*.js'];

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
    require('./index.js');  // Starts the server after the documentation is generated
});
