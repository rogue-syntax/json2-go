# JSON2-Go
'json2-go' is a convenience command line tool for taking a json formatted mysql row result and generating a GO struct and row scan function.
* CAn be quite useful when you have a joined view with 50 colunms that keeps changing around throughout the courdse of developemnt!


# Why?
I was tired of having to update my struct definintions and sql row scanning functions for large, many columned mysql / mariadb joined views:
* When changing joining logic would cause a reordering of lots of columns / struct feilds
* When adding / removing / altering columns and column types
* etc.

# Caveat
This utility only works with non null column values to avoid the issue of scanning sql null values into go primatives.

# How
Many mysql/mariadb IDE programs will help you export a JSON serialization of a result set a large, complex joined table or view selection result.
Export _one_ row with all columns holding non null data to somefile.json:
``` js
[
	{"user_id":"1","email_id":"1", "email_id":"1", "email_value":"admin@rogue-syntax.com"}
	
]
```
* json2-go uses the Clarinet.js stream parser to mitigate and preserve duplicate column names which are incompatable with JSON.parse
* so multiple rows will result in duplicate fields for every row
* so, just export _one_ row with all columns holding non null data to somefile.json


## Install from npm and use with npm:
```console
admin@rogue-syntax.com:~$ npm install -g json2-go
admin@rogue-syntax.com:~$ npm exec json2-go --file=./somefile.json --out-./ --name:MyType
```

## Install from github and use with npm:
```console
admin@rogue-syntax.com:~$ git clone https://github.com/rogue-syntax/json2-go.git
admin@rogue-syntax.com:~$ cd json2-go
admin@rogue-syntax.com:~/json2-go$ npm run j2g --file=./somefile.json --out-./ --name:MyType
```

## Install from github and use with nodejs
```console
admin@rogue-syntax.com:~$ git clone https://github.com/rogue-syntax/json2-go.git
admin@rogue-syntax.com:~$ cd json2-go
admin@rogue-syntax.com:~/json2-go$ nodejs json2go.js --file=./somefile.json --out-./ --name:MyType
```

## Duplicate column names from join 
```console
If you have a join that results in duplicate column names, json2go will flag and generate duplicate struct fields:
- use optional argument --duplicates, otherwise dupicates will be omitted from type definition (while still being mitigated from incoming sql rows in the scanner)
- output type with duplicates:
```

## Command Line Arguments
* --file= Path to your json file
* --name= Name for the type definition
* --out= Path to outut to
* --duplicates= Optional flag to include duplicate fields in type definition

``` go
type User struct { 
	User_id  string 
	Email_id  string 
	email_id_DUPLICATE_0  string 
	Email_value  string 
}
```
- output scanner with duplicates:
``` go
func ScanUser( ul *User, rows * sql.Rows) error { 
	var duplicateInt int 
	var duplicateFloat64 float64 
	var duplicateString int 
	_ = duplicateInt 
	_ = duplicateFloat64 
	_ = duplicateString 
	scanErr := rows.Scan(&ul.User_id, 
	&ul.Email_id, 
	&duplicateString, 
	&ul.Email_value, 
	)
	if scanErr != nil {
		return scanErr
	}
	return nil
}
```
