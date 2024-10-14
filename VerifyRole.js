const VerifyRole = (requiredGroups) => {
    return (req, res, next) => {
        if (!req.session.user) {
            return res.redirect(process.env.APP_PATH + '/login');
        }

        if (requiredGroups.length === 0) {
            return res.status(403).send('Forbidden: No authorized groups specified');
        }

        const decodedIdToken = req.session.user.decodedIdToken;

        if (decodedIdToken && decodedIdToken.memberOf) {
            const userGroups = decodedIdToken.memberOf;

             const hasRequiredGroup = requiredGroups.some(group => userGroups.includes(group));
            if (hasRequiredGroup) {
                return next();
            }
        }

        return res.status(403).send('Du har inte rättigheter för denna sida, endast för personal på KTH Biblioteket');
    };
};

module.exports = VerifyRole;