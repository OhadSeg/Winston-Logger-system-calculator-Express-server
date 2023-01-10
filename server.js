//jshint esversion:6
import {Stack} from "./stack.js";
import express from "express";
import * as fs from "fs";
import winston from "winston";
const {format, transports, debug, info } = winston

const operations = ["PLUS", "MINUS", "TIMES", "DIVIDE", "POW", "ABS", "FACT"];
let stack = new Stack();
let requestsCounter = 1;

const app = express();
app.use(express.json());

let requestTransport = {
    file: new transports.File({
        filename: 'logs/requests.log',
        format: format.combine(
        format.timestamp({format: 'DD-MM-YYYY HH:mm:ss.SSS'}),
        format.printf(info => `${[info.timestamp]} ${info.level.toUpperCase()}: ${info.message} | request #${requestsCounter} `),
        ),
        level: 'info'
    }),
    console: new transports.Console({
        format: format.combine(
            format.timestamp({format: 'DD-MM-YYYY HH:mm:ss.SSS'}),
            format.printf(info => `${[info.timestamp]} ${info.level.toUpperCase()}: ${info.message} | request #${requestsCounter} `),
        ),
        level: 'info'
    })
  }
  let stackTransport = {
    file: new transports.File({
        filename: 'logs/stack.log',
        level: 'info',
        format:format.combine(
            format.timestamp({format: 'DD-MM-YYYY HH:mm:ss.SSS'}),
            format.printf(info => `${[info.timestamp]} ${info.level.toUpperCase()}: ${info.message} | request #${requestsCounter} `),
        )})
  }
  let independentTransport = {
    file: new transports.File({
        filename: 'logs/independent.log',
        level: 'debug',
        format: format.combine(
            format.timestamp({format: 'DD-MM-YYYY HH:mm:ss.SSS'}),
            format.printf(info => `${[info.timestamp]} ${info.level.toUpperCase()}: ${info.message} | request #${requestsCounter} `),
        )}),
  }
  
  const requestLogger = winston.createLogger({
    transports:[
          requestTransport.file,
          requestTransport.console
        ]
  });
  
  const stackLogger = winston.createLogger({
    transports: stackTransport.file
  });
  
  const indepLogger = winston.createLogger({
    transports: independentTransport.file
  });

app.post("/independent/calculate", function (req,res){
    const start = performance.now();
    requestLogger.info(`Incoming request | #${requestsCounter} | resource: /independent/calculate | HTTP Verb POST`);

    let operator = req.body.operation;
    operator = operator.toUpperCase();         // In order to checking case insensetive

     const oneArgumentOperation = operator === "ABS" || operator === "FACT" ;
    
    if(!operations.includes(operator)) {
        res.status(409).send({ "error-message": `Error: unknown operation: ${req.body.operation}`});
        indepLogger.error(`Server encountered an error ! message: Error: unknown operation: ${req.body.operation}`)
        requestsCounter++;
        return;
    }
    else if(req.body.arguments.length < 2 && !oneArgumentOperation) {
        res.status(409).send({ "error-message": `Error: Not enough arguments to perform the operation ${req.body.operation}`})
        indepLogger.error(`Server encountered an error ! message: Error: Not enough arguments to perform the operation ${req.body.operation}`)
        requestsCounter++;
        return;
    }

    else if(req.body.arguments.length < 1 && oneArgumentOperation) {
        res.status(409).send({"error-message": `Error: Not enough arguments to perform the operation ${req.body.operation}`});
        indepLogger.error(`Server encountered an error ! message: Error: Not enough arguments to perform the operation ${req.body.operation}`)
        requestsCounter++;
        return;
    }

    else if(req.body.arguments.length > 2 && !oneArgumentOperation) {
        res.status(409).send({"error-message": `Error: Too many arguments to perform the operation ${req.body.operation}`});
        indepLogger.error(`Server encountered an error ! message: Error: Too many arguments to perform the operation ${req.operation}`)
        requestsCounter++;
        return;
    }
    else if(req.body.arguments.length > 1 && oneArgumentOperation) {
        res.status(409).send({"error-message": `Error: Too many arguments to perform the operation ${req.body.operation}`});
        indepLogger.error(`Server encountered an error ! message: Error: Not enough arguments to perform the operation ${req.body.operation}`)
        requestsCounter++;
        return;
    }
    
    let calculation, y;
    const x = req.body.arguments[0];
    if(!oneArgumentOperation){
        y = req.body.arguments[1];
    }


    switch (operator){
        case 'PLUS':
            calculation = x + y;
            break
        case 'MINUS':
            calculation = x - y;
            break
        case 'TIMES':
            calculation = x * y;
            break
        case 'DIVIDE':
            if(y === 0) {
                res.status(409).send({"error-message": `Error while performing operation Divide: division by 0`})
                indepLogger.error(`Server encountered an error ! message: Error while performing operation Divide: division by 0`)
                requestsCounter++;
                return;
            }
            calculation = Math.floor(x / y);
            break
        case 'POW':
            calculation = Math.pow(x,y);
            break
        case 'ABS':
            calculation = Math.abs(x);
            break
        case 'FACT':
                if(x < 0) {
                    res.status(409).send({"error-message": `Error while performing operation Factorial: not supported for the negative number`});
                    indepLogger.error(`Server encountered an error ! message: Error while performing operation Factorial: not supported for the negative number`)
                    requestsCounter++;
                    return;
                }
                calculation = factorial(x);
                break
        }
        
        res.status(200).send({ "result": calculation });
        const end = performance.now();
        indepLogger.info(`Performing operation ${req.body.operation.toLowerCase()}. Result is ${calculation}`)
        indepLogger.debug(`Performing operation: ${req.body.operation.toLowerCase()}(${req.body.arguments}) = ${calculation}`)
        requestLogger.debug(`request #${requestsCounter} duration: ${Math.floor(end - start)}ms`)
        requestsCounter++;

    });

app.get("/stack/size", function (req,res){
    const start = performance.now();
    requestLogger.info(`Incoming request | #${requestsCounter} | resource: /stack/size | HTTP Verb GET`)
    stackLogger.info(`Stack size is ${stack.length()}`)
    stackLogger.debug(`Stack content (first == top): [${stack.reverseStack()}]`)
    res.status(200).send({"result":stack.length()})
    const end = performance.now();
    requestLogger.debug(`request #${requestsCounter} duration: ${Math.floor(end - start)}ms`)
    requestsCounter++;
}); 

app.put("/stack/arguments", (req, res) => {
    const start = performance.now()
    requestLogger.info(`Incoming request | #${requestsCounter} | resource: /stack/arguments | HTTP Verb PUT`)
    stackLogger.info(`Adding total of ${req.body.arguments.length} argument(s) to the stack | Stack size: ${stack.length() + req.body.arguments.length}`)
    stackLogger.debug(`Adding arguments: ${req.body.arguments} | Stack size before ${stack.length()} | stack size after ${stack.length() + req.body.arguments.length}`)

    req.body.arguments.forEach((element) => {
        stack.push(element);
    });
    res.status(200).send({ "result": stack.length() });
    const end = performance.now();
    requestLogger.debug(`request #${requestsCounter} duration: ${Math.floor(end - start)}ms`)
    requestsCounter++;
});

app.get("/stack/operate", function (req,res){
    const start = performance.now()
    requestLogger.info(`Incoming request | #${requestsCounter} | resource: /stack/operate | HTTP Verb GET`)
    
    let operator = req.query.operation;
    operator = operator.toUpperCase();         // In order to checking case insensetive

    const oneArgumentOperation = operator === "ABS" || operator === "FACT" ;

    if(!operations.includes(operator)) {
        res.status(409).send({ "error-message": `Error: unknown operation: ${req.query.operation}`});
        stackLogger.error(`Server encountered an error ! message: Error: unknown operation: ${req.query.operation.toLowerCase()}`)
        requestsCounter++;
        return;
    }
    else if(stack.length() < 2 && !oneArgumentOperation) {
        res.status(409).send({"error-message": `Error: cannot implement operation ${req.query.operation}. It requires 2 arguments and the stack has only ${stack.length()} arguments`});
        stackLogger.error(`Server encountered an error ! message: Error: cannot implement operation ${req.query.operation.toLowerCase()}. It requires 2 arguments and the stack has only ${stack.length()} arguments`)
        requestsCounter++;
        return;
    }

    else if(stack.length() < 1 && oneArgumentOperation) {
        res.status(409).send({"error-message": `Error: cannot implement operation ${req.query.operation}. It requires 1 argument and the stack has only ${stack.length()} arguments`});
        stackLogger.error(`Server encountered an error ! message: Error: cannot implement operation ${req.query.operation.toLowerCase()}. It requires 1 arguments and the stack has only ${stack.length()} arguments`)
        requestsCounter++;
        return;
    }
    else{
        let calculation, y;
        const x = stack.pop();
        if(!oneArgumentOperation){
            y = stack.pop();;
        }

        switch (operator){
            case 'PLUS':
                calculation = x + y;
                break
            case 'MINUS':
                calculation = x - y;
                break
            case 'TIMES':
                calculation = x * y;
                break
            case 'DIVIDE':
                if(y === 0) {
                    res.status(409).send({"error-message": `Error while performing operation Divide: division by 0`});
                    stackLogger.error(`Server encountered an error ! message: Error while performing operation Divide: division by 0`)
                    requestsCounter++;
                    return;
                }
                calculation = Math.floor(x / y);
                break
            case 'POW':
                calculation = Math.pow(x,y);
                break
            case 'ABS':
                calculation = Math.abs(x);
                break
            case 'FACT':
                    if(x < 0) {
                        res.status(409).send({"error-message": `Error while performing operation Factorial: not supported for the negative number`});
                        stackLogger.error(`Server encountered an error ! message: Error while performing operation Factorial: not supported for the negative number`)
                        requestsCounter++;
                        return;
                    }
                    calculation = factorial(x);
                    break
            }
            
            res.status(200).send({ "result": calculation  });
            stackLogger.info(`Performing operation ${req.query.operation.toLowerCase()}. Result is ${calculation} | stack size: ${stack.length()}`)
            if(oneArgumentOperation){
                stackLogger.debug(`Performing operation: ${req.query.operation.toLowerCase()}(${x}) = ${calculation}`)
            }
            else{
                stackLogger.debug(`Performing operation: ${req.query.operation.toLowerCase()}(${x},${y}) = ${calculation}`)
            }
    }   
    const end = performance.now()
    requestLogger.debug(`request #${requestsCounter} duration: ${Math.floor(end - start)}ms`)
    requestsCounter++;
});

app.delete("/stack/arguments", function (req,res) {
    requestLogger.info(`Incoming request | #${requestsCounter} | resource: /stack/arguments | HTTP Verb DELETE`)
    const start = performance.now()

    if(req.query.count > stack.length()){
        res.status(409).send({ "error-message": `Error: cannot remove ${req.query.count} from the stack. It has only ${stack.length()} arguments`});
        stackLogger.error(`Server encountered an error ! message: Error: cannot remove ${req.query.count} from the stack. It has only ${stack.length()} arguments`)
    }
    else {
        for(let i = 0; i < req.query.count;i++){
            stack.pop();
        }
        res.status(200).send({ result: stack.length() });
        stackLogger.info(`Removing total ${req.query.count} argument(s) from the stack | Stack size: ${stack.length()}`)

    }
    const end = performance.now();
    requestLogger.debug(`request #${requestsCounter} duration: ${Math.floor(end - start)}ms`)
    requestsCounter++;

});

app.get("/logs/level",function (req,res) {
    requestLogger.info(`Incoming request | #${requestsCounter} | resource: /logs/level | HTTP Verb GET`)
    const start = performance.now()
    let loggerlevel;

    switch (req.query["logger-name"]) {
        case "stack-logger":        
            loggerLevel = stackTransport.file.level;
            break
        case "independent-logger":
            loggerLevel = stackTransport.file.level;
            break
        case "request-logger":
            loggerLevel = requestTransport.file.level;
            break
        default:
            res.status(409).send(`Failure: no logger named ${req.query["logger-name"]}`);
            break
    }

    if(loggerlevel){
        res.status(200).send(`Success: ${loggerLevel.toUpperCase()}`);
    }
    const end = performance.now();
    requestLogger.debug(`request #${requestsCounter} duration: ${Math.floor(end - start)}ms`)
    requestsCounter++;
});

app.put("/logs/level",function (req,res) {
    requestLogger.info(`Incoming request | #${requestsCounter} | resource: /logs/level | HTTP Verb PUT`)
    const start = performance.now()
    let loggerlevel;

    const loggerLevels = ['ERROR', 'INFO', 'DEBUG'];
    if(!loggerLevels.includes(req.query["logger-level"].toUpperCase())) {
        res.status(409).send(`Failure:${req.query["logger-level"]} is not a valid logger level`);
    }
    else{

        switch (req.query["logger-name"]) {
            case "request-logger":
                requestTransport.file.level = req.query["logger-level"].toLowerCase()
                requestTransport.console.level = req.query["logger-level"].toLowerCase()
                loggerlevel = requestTransport.file.level;
                break
            case "stack-logger":
                stackTransport.file.level = req.query["logger-level"].toLowerCase()
                loggerlevel = stackTransport.file.level;
                break
            case "independent-logger":
                independentTransport.file.level = req.query["logger-level"].toLowerCase()
                loggerlevel = independentTransport.file.level;
                break
            default:
                res.status(409).send(`Failure: no logger named ${req.query["logger-name"]}`);
                break
        }
        if (loggerlevel)
            res.status(200).send(`Success: ${loggerlevel.toUpperCase()}`);
    }
    const end = performance.now();
    requestLogger.debug(`request #${requestsCounter} duration: ${Math.floor(end - start)}ms`)
    requestsCounter++;
});



const server = app.listen(9583, () => {
    console.log("Server listening on port 9583...\n");

    if (fs.existsSync("./logs")){
        fs.rmSync('./logs', { recursive: true, force: true });
    }
    fs.mkdirSync("./logs");

});

  function factorial(num) {
    if (num < 0)
        return -1;
    else if (num == 0)
        return 1;
    else {
        return (num * factorial(num - 1));
    }
}  
  