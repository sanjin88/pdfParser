const fs = require('fs'),
    PDFParser = require("pdf2json"),
    _ = require('lodash'),
    async = require('async'),
    rl = require('readline');;


(function () {
    const folderPath = process.argv[2];
    if (!folderPath) {
        console.log('No folder path provider as argument!');
        return;
    } else if (false) { // TODO
        console.log('Invalid folder path provided!');
        return;
    } else {
        readPdfsFromFolder(folderPath);
    }
})();

function readPdfsFromFolder(folder) {
    fs.readdir(folder, (err, files) => {
        async.eachSeries(
            _.map(files, f => folder + f),
            readOneFile,
            err => {
                if (err) { console.log(err) }
            }
        );
    });
}

function readOneFile(path, cb) {
    let pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", errData => {
        cb(errData);
    });
    pdfParser.on("pdfParser_dataReady", pdfData => {
        fs.writeFile("./test.json", JSON.stringify(pdfData), (err) => { });   // for testing purposes  
        processData(pdfData, cb)
    });
    pdfParser.loadPDF(path);
}

function processData(data, cb) {
    let dataArray = parseDataToArray(data.formImage.Pages);
    extractFirstTimeFirstYearStudentScores(dataArray, cb);
}

function extractFirstTimeFirstYearStudentScores(data, cb) {
    const initialIndex = data.indexOf('SAT Critical ');
    // TODO remove if initial index not exists
    const limit = initialIndex + 35;
    let scores = {
        SATCriticalReading: {},
        SATMath: {},
        SATWriting: {}
    }
    for (var i = initialIndex + 5; i <= limit; i += 5) {
        if (data[i + 1].length <= 7 && data[i + 1].length <= 7 && data[i + 1].length <= 7) {
            scores.SATCriticalReading[data[i]] = data[i + 1];
            scores.SATMath[data[i]] = data[i + 2];
            scores.SATWriting[data[i]] = data[i + 3];
            if (i - initialIndex - 30 === 0) {
                i -= 1;
            }
        }
    }
    scores.dataSet = data[0].replace('Common Data Set ', '');
    confirmSave(scores, cb)
}

function confirmSave(scores, cb) {
    console.log(scores);
    confirm('Do you wanna save this y/n \n? ', function (answer) {
        if (answer === 'y' || answer === 'Y') {
            saveToJson(scores);
            cb();
        } else if (answer === 'n' || answer === 'N') {
            cb();
        } else {
            confirmSave(scores, cb);
        }
    });
}

function parseDataToArray(data) {
    return _.reduce(data, (acc, page) => {
        acc = acc.concat(_.reduce(page.Texts, (acc1, entry) => {
            if (entry.R.length) {
                acc1.push(parserUnescape(entry.R[0].T));
            }
            return acc1;
        }, []))
        return acc;
    }, [])
}

function parserUnescape(data) {
    return decodeURIComponent(data).replace(/\s\s+/g, ' ');
}

function confirm(question, callback) {
    var r = rl.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    r.question(question + '\n', function (answer) {
        r.close();
        callback(answer);
    });
}

function saveToJson(data) {
    fs.readFile('./result.json', 'utf8', function (err, file) {
        if (err) throw err;

        var json = [];
        if (file.length) {
            json = JSON.parse(file)
        }

        json.push(data)
        fs.writeFile("./result.json", JSON.stringify(json), () => { });
    });
}