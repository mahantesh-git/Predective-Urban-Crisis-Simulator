const { body, validationResult } = require('express-validator');

const simulateValidationRules = [
    body('trafficReduction')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('trafficReduction must be between 0 and 100'),

    body('industrialCut')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('industrialCut must be between 0 and 100'),

    body('heatwaveLevel')
        .optional()
        .isFloat({ min: 0, max: 5 })
        .withMessage('heatwaveLevel must be between 0 and 5'),

    body('waterConservation')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('waterConservation must be between 0 and 100'),

    body('greenSpaceExpansion')
        .optional()
        .isFloat({ min: 0, max: 100 })
        .withMessage('greenSpaceExpansion must be between 0 and 100'),
];

const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
    }
    next();
};

module.exports = { simulateValidationRules, validate };
