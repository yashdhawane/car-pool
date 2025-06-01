// validators/authValidator.js
import Joi from 'joi';

export const signupSchema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  // role is optional in signup, default set in controller/model
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const roleChangeSchema = Joi.object({
  driverProfile: Joi.object({
    licenseNumber: Joi.string().required(),
    vehicle: Joi.object({
      make: Joi.string().required(),
      model: Joi.string().required(),
      year: Joi.number().required(),
      plateNumber: Joi.string().required()
    }).required(),
    experienceYears: Joi.number().required()
  }).required()
});
