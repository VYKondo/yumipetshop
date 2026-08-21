"use strict";
/**
 * Basic types shared between frontend and backend
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppointmentStatus = exports.UserRole = void 0;
// Enums from Prisma schema
var UserRole;
(function (UserRole) {
    UserRole["OWNER"] = "OWNER";
    UserRole["STAFF"] = "STAFF";
})(UserRole || (exports.UserRole = UserRole = {}));
var AppointmentStatus;
(function (AppointmentStatus) {
    AppointmentStatus["SCHEDULED"] = "SCHEDULED";
    AppointmentStatus["CONFIRMED"] = "CONFIRMED";
    AppointmentStatus["DONE"] = "DONE";
    AppointmentStatus["CANCELED"] = "CANCELED";
    AppointmentStatus["NO_SHOW"] = "NO_SHOW";
})(AppointmentStatus || (exports.AppointmentStatus = AppointmentStatus = {}));
//# sourceMappingURL=index.js.map