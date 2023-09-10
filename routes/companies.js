"use strict";

/** Routes for companies. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");
const Company = require("../models/company");

const companyNewSchema = require("../schemas/companyNew.json");
const companyUpdateSchema = require("../schemas/companyUpdate.json");
const companyFilterSchema = require("../schemas/companyFilter.json");

const router = new express.Router();


/** POST / { company } =>  { company }
 *
 * company should be { handle, name, description, numEmployees, logoUrl }
 *
 * Returns { handle, name, description, numEmployees, logoUrl }
 *
 * Authorization required: login (admin)
 */

router.post("/", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, companyNewSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.create(req.body);
    return res.status(201).json({ company });
  } catch (err) {
    return next(err);
  }
});

/** GET /  =>
 *   { companies: [ { handle, name, description, numEmployees, logoUrl }, ...] }
 * 
 *   If a query string is passed through, users can filter their results using three options:
 *      - name: shows any companies that have a name that includes some of the string (string; case-insensitive)
 *      - minEmployees: shows any companies that have no fewer than X number of employees (integer; must be lower than maxEmployees)
 *      - maxEmployees: shows any companies that have no more than X number of employees (integer; must be greater than minEmployees)
 * 
 *   An error will be thrown for the following situations if users choose to filter the results:
 *      - Passing variables other than "name", "minEmployees", or "maxEmployees" in the query string (BadRequestError)
 *      - Using invalid data types for any of the query string variables (BadRequestError)
 *      - The value of minEmployees being larger than maxEmployees (BadRequestError)
 *      - No companies match the criteria provided via the query string (NotFoundError)
 *
 * Authorization required: none
 */

router.get("/", async function (req, res, next) {
  try {
    if (Object.keys(req.query).length !== 0) {
      // Extract the "options" from the query string and change the numbered-strings to integers (if they exist)
      const options = req.query;
      if(options.minEmployees){
        options.minEmployees = Number(options.minEmployees)
      }
      if(options.maxEmployees){
        options.maxEmployees = Number(options.maxEmployees)
      }

      // json schema validates the options object (throws an error if it's not valid)
      const validator = jsonschema.validate(options, companyFilterSchema);
      if (!validator.valid) {
        const errs = validator.errors.map(e => e.stack);
        throw new BadRequestError(errs);
      }

      // Add an extra validator if minEmployees and maxEmployees are both used and minEmployees is greater than (or equal to) maxEmployees (json schema not efficient at field comparisons)
      if (options.minEmployees && options.maxEmployees && options.minEmployees >= options.maxEmployees){
        throw new BadRequestError(`${options.minEmployees} is greater than or equal to ${options.maxEmployees}`)
      }

      // Use a method to filter out results
      const results = await Company.filterCompanies(options);
      return res.json({companies: results});
    } else {
      const companies = await Company.findAll();
      return res.json({ companies });
    }
  } catch (err) {
    return next(err);
  }
});

/** GET /[handle]  =>  { company }
 *
 *  Company is { handle, name, description, numEmployees, logoUrl, jobs }
 *   where jobs is [{ id, title, salary, equity }, ...]
 *
 * Authorization required: none
 */

router.get("/:handle", async function (req, res, next) {
  try {
    const company = await Company.get(req.params.handle);
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/** PATCH /[handle] { fld1, fld2, ... } => { company }
 *
 * Patches company data.
 *
 * fields can be: { name, description, numEmployees, logo_url }
 *
 * Returns { handle, name, description, numEmployees, logo_url }
 *
 * Authorization required: login (admin)
 */

router.patch("/:handle", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  try {
    const validator = jsonschema.validate(req.body, companyUpdateSchema);
    if (!validator.valid) {
      const errs = validator.errors.map(e => e.stack);
      throw new BadRequestError(errs);
    }

    const company = await Company.update(req.params.handle, req.body);
    return res.json({ company });
  } catch (err) {
    return next(err);
  }
});

/** DELETE /[handle]  =>  { deleted: handle }
 *
 * Authorization: login (admin)
 */

router.delete("/:handle", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
  try {
    await Company.remove(req.params.handle);
    return res.json({ deleted: req.params.handle });
  } catch (err) {
    return next(err);
  }
});


module.exports = router;
