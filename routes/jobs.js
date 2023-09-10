"use strict";

/** Routes for jobs. */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn, ensureAdmin } = require("../middleware/auth");
const Job = require("../models/job");

const jobNewSchema = require("../schemas/jobNew.json");
const jobUpdateSchema = require("../schemas/jobUpdate.json");
const jobFilterSchema = require("../schemas/jobFilter.json"); 

const router = new express.Router();

/** POST / { job } => { job }
 * 
 * job should be { title, salary, equity, companyHandle }
 * 
 * Returns { id, title, salary, equity, companyHandle }
 * 
 * Authorization required: login (admin)
 */

router.post("/", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, jobNewSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Job.create(req.body);
        return res.status(201).json({ job });
    } catch (err) {
        return next(err);
    }
});

/** GET / =>
 *     { jobs: [ { id, title, salary, equity, companyHandle }, ...] }
 * 
 *     If a query string is passed through, users can filter their results using three options:
 *        - title: shows any jobs that have a title that includes some of the string (string)
 *        - minSalary: shows any jobs that have at least X or more in salary (integer)
 *        - hasEquity: if true, only displays jobs that have an equity above 0 (boolean)
 *     An error will be thrown for the following situations if users choose to filter the results:
 *        - Passing variables other than "title", "minSalary", or "hasEquity" (BadRequestError)
 *        - Using invalid data types for any of the query string variables (BadRequestError)
 *        - Using a value smaller than 0 for minSalary (BadRequestError)
 *        - No jobs match the criteria provided via the query string (NotFoundError)
 * 
 * Authorization required: none
 * 
 */

router.get("/", async function (req, res, next) {
    try {
        if (Object.keys(req.query).length !== 0) {
            // Extract the "options" from the query string and changes the numbered-string from minSalary to an integer and the string from hasEquity to a boolean (if they exist)
            const options = req.query;
            if(options.minSalary){
                options.minSalary = Number(options.minSalary)
            }

            if(options.hasEquity !== undefined){
                if(options.hasEquity === "true"){
                    options.hasEquity = true
                } else if (options.hasEquity === "false") {
                    options.hasEquity = false
                }
            }

            // json schema validates the options object (throws an error if it's not valid)
            const validator = jsonschema.validate(options, jobFilterSchema);
            if (!validator.valid) {
                const errs = validator.errors.map(e => e.stack);
                throw new BadRequestError(errs);
            }

            // Use a method to filter out the results
            const results = await Job.filterJobs(options);
            return res.json({companies: results});

        } else {
            const jobs = await Job.findAll();
            return res.json({ jobs });
        }
    } catch (err) {
        return next(err);
    }
});

/** GET /[id] => { job } 
 * 
 * Job is { id, title, salary, equity, companyHandle }
 * 
 * Authorization required: none
*/

router.get("/:id", async function (req, res, next) {
    try {
        const job = await Job.get(req.params.id);
        return res.json({ job });
    } catch (err) {
        return next(err);
    }
});

/** PATCH /[id] {fld1, fld2, ... } => { job }
 * 
 * Patches job data.
 * 
 * fields can be: { title, salary, equity }
 * 
 * Returns { id, title, salary, equity, companyHandle }
 * 
 * Authorization required: login (admin)
 */

router.patch("/:id", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
    try {
        const validator = jsonschema.validate(req.body, jobUpdateSchema);
        if (!validator.valid) {
            const errs = validator.errors.map(e => e.stack);
            throw new BadRequestError(errs);
        }

        const job = await Job.update(req.params.id, req.body);
        return res.json({ job });
    } catch (err) {
        return next(err);
    }
});

/************************************** PATCH /jobs/id/:id */

/** DELETE /[id] => { deleted: job }
 * 
 * Authorization: login (admin)
*/

router.delete("/:id", ensureLoggedIn, ensureAdmin, async function (req, res, next) {
    try {
        await Job.remove(req.params.id);
        return res.json({ deleted: "job" });
    } catch (err) {
        return next(err);
    }
})

/************************************** DELETE /jobs/id/:id */

module.exports = router;