"use strict";

/** Convenience middleware to handle common auth cases in routes. */

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");


/** Middleware: Authenticate user.
 *
 * If a token was provided, verify it, and, if valid, store the token payload
 * on res.locals (this will include the username and isAdmin field.)
 *
 * It's not an error if no token was provided or if the token is not valid.
 */

function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers && req.headers.authorization;
    if (authHeader) {
      const token = authHeader.replace(/^[Bb]earer /, "").trim();
      res.locals.user = jwt.verify(token, SECRET_KEY);
    }
    return next();
  } catch (err) {
    return next();
  }
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

function ensureLoggedIn(req, res, next) {
  try {
    if (!res.locals.user) throw new UnauthorizedError();
    return next();
  } catch (err) {
    return next(err);
  }
}

/** Middleware that verifies if the current user is an admin.
 * 
 * If not, raises Unauthorized.
 */

function ensureAdmin(req, res, next) {
  try {
    if (!res.locals.user.isAdmin) throw new UnauthorizedError;
    return next();
  } catch (err) {
    return next(err)
  }
}

/** Middleware that verifies if the current user is either an admin or the "owner" of the user data.
 * 
 *  An "owner" can be defined as a user that shares the same username as the username in the request.
 * 
 *  If neither, raises Unauthorized.
 */

function ensureAdminOrUser(req, res, next) {
  try {
    const owner = req.params.username;
    const userObj = res.locals.user;
    if (!userObj.isAdmin && owner !== userObj.username) throw new UnauthorizedError;
    return next();
  } catch (err) {
    return next(err)
  }
}

module.exports = {
  authenticateJWT,
  ensureLoggedIn,
  ensureAdmin,
  ensureAdminOrUser,
};
