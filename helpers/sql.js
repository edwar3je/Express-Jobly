const { BadRequestError } = require("../expressError");

// THIS NEEDS SOME GREAT DOCUMENTATION.

// This function accepts two objects to create an object that can be used to make partial updates to SQL.
// The first object is the "dataToUpdate", which contains the values to add to SQL. The second object contains keys that match the names of the keys in the first object, along with their respective names in SQL as values.
// The function starts by extracting the keys from an object to determine if it's empty (if so, throws a "BadRequestError").
// Afterwards, the map function is used on the keys to generate an array of strings that can be used for an SQL query.
// Finally, the function returns an unnamed object that has two keys: setCols (a long string consisting of all the query strings from the array) and values (an array consisting of the values from the initial object).

function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  
  // Extracts the keys from dataToUpdate and throws an error if there are no keys
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // Creates a new array of query strings consisting of the column name (based on the key from "keys") and an index value to place using string interpolation.
  // For the "column" name portion of the string, if the key from the original object has a corresponding key on the second object, then it will use the value from that second object (otherwise, because it's null, it will stick with the key name from the first object).
  // The index number increments by 1 each time it's used in the loop, thus the index will always start at 1.
  
  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  // Returns an object consisting of all query strings concatenated under the key "setCols" and the value for each key (as an array) under the key "values"
  
  // {firstName: 'Aliya', age: 32} => {setCols: `"first_name"=$1, "age"=$2`, values: ['Aliya', 32]}
  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
