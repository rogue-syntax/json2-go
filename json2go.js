#!/usr/bin/env node
var fs = require('fs');
var clarinet = require('clarinet');
//GO STRUCT AUTOGEN


function getArgs() {
    let args = {};
    process.argv.slice(2, process.argv.length).forEach(arg => {
        // long arg
        if (arg.slice(0, 2) === '--') {
            const longArg = arg.split('=');
            const longArgFlag = longArg[0].slice(2, longArg[0].length);
            const longArgValue = longArg.length > 1 ? longArg[1] : true;
            args[longArgFlag] = longArgValue;
        }
        // flags
        else if (arg[0] === '-') {
            const flags = arg.slice(1, arg.length).split('');
            flags.forEach(flag => {
                args[flag] = true;
            });
        }
    });
    return args;
}




onlyLetters = /^[a-zA-Z]+$/;

structFirstLetter = function (key, letterCase) {
    while (key.length > 0) {
        if (onlyLetters.test(key.charAt(0))) {
            if (letterCase === 'lower') {
                key = key.charAt(0).toLowerCase() + key.slice(1);
            } else {
                key = key.charAt(0).toUpperCase() + key.slice(1);
            }
            break;
        } else {
            key = key.slice(1);
        }
    }
    return key;
}

function replaceDuplicateJSON(data) {

    const parser = clarinet.parser();
    const result = {};
    var i = 0;
    var dummyData = JSON.parse(data);
	if( typeof dummyData.length !== 'undefined' ){
		dummyData = dummyData[0];
	}
    var hasDuplicates = false;
    parser.onkey = parser.onopenobject = k => {
        if (typeof result[k] !== 'undefined') {
            hasDuplicates = true;
            let NewK = structFirstLetter(k, 'lower');
            let newKey = NewK + `_DUPLICATE_` + i;
            result[newKey] = dummyData[k];
            i += 1;
        } else {
            result[k] = dummyData[k];
        }
    };
    parser.write(data).close();
    return {
        res: result,
        duplicates: hasDuplicates
    };
}

jsonToGoStruct = function (namer, inpStr) {
    let obj = {};
    let outp = `type ` + namer + ` struct { \r\n\t`;
    var repDup = replaceDuplicateJSON(inpStr);
    var inp = repDup.res;
	console.log(inp)
    let keyList = Object.keys(inp);
    keyList.forEach((key) => {
        let val = inp[key];
        let type = typeof inp[key];
        let newKey = "";
        if (key.includes("_DUPLICATE_") === false) {
            newKey = structFirstLetter(key);
        } else {
            newKey = key;
        }
        let typeVal = "";
        if (type === 'number') {
            typeVal = numberIsIntOrFloat();
        } else if (type === 'string') {
            typeVal = 'string';
        } else if (type === 'boolean') {
            typeVal = 'bool';
        } else if (typeof x == "object" && !x ){
			typeVal = '*{}interface' //nil value, pointer but unable to determine type
		}else{
            typeVal === '!UNKOWN_TYPE!'
        }

        outp += newKey + `  ` + typeVal + ` \r\n\t`

    })
    outp += `}`;
    obj.def = outp;

    outp = "";
    outp += `func Scan` + namer + `( ul *` + namer + `, rows * sql.Rows) error { \r\n\t`;
    if (repDup.duplicates === true) {
        outp += `var duplicateInt int \r\n\t`;
        outp += `var duplicateFloat64 float64 \r\n\t`;
        outp += `var duplicateString int \r\n\t`;
        outp += `_ = duplicateInt \r\n\t`;
        outp += `_ = duplicateFloat64 \r\n\t`;
        outp += `_ = duplicateString \r\n\t`;
    }
    outp += `scanErr := rows.Scan(`;
    keyList.forEach((key) => {
        lineStr = "";
        var newKey = structFirstLetter(key);
        if (newKey.includes("_DUPLICATE_")) {
            let type = typeof inp[key];
            if (type === 'number') {
                if (numberIsIntOrFloat() == "int") {
                    lineStr = `&duplicateInt, \r\n\t`;
                } else {
                    lineStr = `&duplicateFloat64, \r\n\t`;
                };
            } else if (type === 'string') {
                lineStr = `&duplicateString, \r\n\t`;
            } else {
                lineStr = `&duplicateUNOWN_TYPE!!!, \r\n\t`;
            }
        } else {
            lineStr = `&ul.` + newKey + `, \r\n\t`;
        }
        outp += lineStr;
    });
    outp += `)
	if scanErr != nil {
		return scanErr
	}
	return nil
}`;
    obj.scan = outp;
    return obj;
}

numberIsIntOrFloat = function (n) {
    let nStr = "" + n;
    if (nStr.includes(".")) {
        return "float64";
    } else {
        return "int";
    }
}



//FIELD DELIM SHOUDL BE <<!NEXT>> not ,
stringToGoStruct = function (namer, inp) {
    let obj = {};
    let outp = `type ` + namer + ` struct { \r\n\t`;

    let bigList = inp.split(`\n`);
    console.log(bigList);
    let keyList = bigList[0].split("<<!NEXT>>");
    let valList = bigList[1].split("<<!NEXT>>");;

    var keysDoneList = [];
    var keyReplacer = {};

    keyList.forEach((key, i) => {
        let val = valList[i];
        let type = typeof valList[i];
        let newKey = structFirstLetter(key);
        let typeVal = "";
        if (type === 'number') {
            typeVal = numberIsIntOrFloat();
        } else if (type === 'string') {
            typeVal = 'string';
        } else {
            typeVal === '!UNKOWN_TYPE!'
        }

        if (keysDoneList.includes(newKey)) {
            keyReplacer[newKey] = { old: newKey, new: newKey + `_` + i };
            outp += keyReplacer[newKey].new + `  ` + typeVal + ` \r\n\t`
        } else {
            outp += newKey + `  ` + typeVal + ` \r\n`
        }

        keysDoneList.push(newKey);

    })
    outp += `}`;
    obj.def = outp;

    outp = "";
    outp += `func Scan ` + namer + `( ul *` + namer + `, rows * sql.Rows) error { \r\n\t`;
    outp += `var duplicateInt int \r\n\t`;
    outp += `var duplicateFloat64 float64 \r\n\t`;
    outp += `var duplicateString int \r\n\t`;
    outp += `_ = duplicateInt \r\n\t`;
    outp += `_ = duplicateFloat64 \r\n\t`;
    outp += `_ = duplicateString \r\n\t`;
    outp += `scanErr := rows.Scan(`;

    var keysDoneList = [];
    keyList.forEach((key, i) => {
        //lineStr = `&ul.Issue_req_id`
        lineStr = "";
        var newKey = structFirstLetter(key);
        if (typeof keyReplacer[newKey] !== 'undefined') {
            let type = typeof valList[i];
            if (type === 'number') {
                if (numberIsIntOrFloat() == "int") {
                    lineStr = `&duplicateInt, \r\n\t`;
                } else {
                    lineStr = `&duplicateFloat64, \r\n\t`;
                };
            } else if (type === 'string') {
                lineStr = `&duplicateString, \r\n\t`;
            } else {
                lineStr = `&duplicateUNOWN_TYPE!!!, \r\n\t`;
            }
        } else {
            lineStr = `&ul.` + newKey + `, \r\n\t`;
        }

        outp += lineStr;
        keysDoneList.push(newKey);

    });
    outp += `)
	if scanErr != nil {
		return scanErr
	}
	return nil
}`;
    obj.scan = outp;
    obj.keysDoneList = keysDoneList;
    return obj;
}


let msgOut = "";

try {
    let args = {};
    if (typeof process.env.npm_command !== 'undefined') {
        args["name"] = process.env.npm_config_name;
        args["file"] = process.env.npm_config_file;
        args["out"] = process.env.npm_config_out;
    } else {
        args = getArgs();
    }

    let jsonStrIn = fs.readFileSync(args["file"], { encoding: 'utf8', flag: 'r' });

    let tyName = args["name"];

    let fileOutputLoc = args["out"];

    let outObj = jsonToGoStruct(tyName, jsonStrIn);

    let defLoc = fileOutputLoc + "/" + tyName + "_def.txt";

    let scanLoc= fileOutputLoc + "/" + tyName + "_scan.txt";

    fs.writeFileSync( defLoc, outObj.def);
    fs.writeFileSync( scanLoc, outObj.scan);

    msgOut = "Go definition and scan function writen to files: \n "+defLoc+" \n "+scanLoc+"\n";


} catch (err) {
    msgOut = err.message+"\n";
}



process.stdout.write(msgOut); 

