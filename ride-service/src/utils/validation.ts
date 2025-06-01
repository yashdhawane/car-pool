import Joi from 'joi';

const locationSchema = Joi.object({
    address: Joi.string().required().messages({
        'string.empty': 'Address is required'
    }),
    city: Joi.string().required().messages({
        'string.empty': 'City is required'
    }),
    coordinates: Joi.array().items(
        Joi.number().required(),
        Joi.number().required()
    ).length(2).required().messages({
        'array.length': 'Coordinates must contain exactly 2 numbers [longitude, latitude]',
        'array.base': 'Coordinates must be an array of numbers'
    })
});

export const createRideSchema = Joi.object({
    origin: locationSchema.required().messages({
        'any.required': 'Origin location is required'
    }),
    
    destination: locationSchema.required().messages({
        'any.required': 'Destination location is required'
    }),

    departureTime: Joi.date()
        .greater('now')
        .required()
        .messages({
            'date.greater': 'Departure time must be in the future',
            'any.required': 'Departure time is required'
        }),

    availableSeats: Joi.number()
        .min(1)
        .max(8)
        .required()
        .messages({
            'number.min': 'Must have at least 1 seat',
            'number.max': 'Cannot exceed 8 seats',
            'any.required': 'Available seats is required'
        }),

    price: Joi.number()
        .min(0)
        .required()
        .messages({
            'number.min': 'Price cannot be negative',
            'any.required': 'Price is required'
        })
}).options({ abortEarly: false });