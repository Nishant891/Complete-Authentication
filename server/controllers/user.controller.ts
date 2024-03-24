import { createUser, findUser, generateAccessToken, generateRefreshToken, updateToken } from "../services/user.service";
import { User } from "../types/user.types";
import { Request, Response } from "express";
import { HandleError } from "../utils/error.handler";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const createNewUser = async (req: Request, res: Response) => {
  const userData = req.body as User;

  try {
    await createUser(userData);

    res.status(200).json({
      success: true,
      message: "User created successfull",
    });
  } catch (err) {
    res.status(400).json(HandleError(err));
  }
};

export const createOTP = async (req: Request, res: Response) => {
  const userData = req.body as User;

  const user = await findUser(userData.email);

  if (user) {
    res.status(400).json({
      success: false,
      message: "User already exits",
    });
  }
  try {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync(userData.password, salt);

    userData.password = hashedPassword;

    const result = await createActivationCode(userData);

    res.status(200).json({
      success: true,
      message: "Activation code created",
      payload: result,
    });
  } catch (err) {
    res.status(400).json(HandleError(err));
  }
};

export const createActivationCode = async (user: User) => {
  const activationCode = Math.floor(1000 + Math.random() * 9000).toString();
  const activationToken = jwt.sign(
    {
      user,
      activationCode,
    },
    process.env.ACTIVATION_SECRET,
    {
      expiresIn: "3d",
    }
  );
  return {
    token: activationToken,
  };
};

export const checkUser = async (req: Request, res: Response) => {
  const userData = req.body as User;

  const user = await findUser(userData.email);

  if(!user){
    res.status(400).json({
      success: false,
      message: "User does not exits",
    });
  }

  if (!bcrypt.compare(userData.password, user.password)) {
    res.status(400).json({
      success: false,
      message: "Password is incorrect",
    });
  }

  const Id = {
    userId : user._id
  }
  const accessToken = await generateAccessToken(user);
  const refreshToken = await generateRefreshToken(Id.userId);

  await updateToken(Id.userId, refreshToken);

  res.status(200).json({
    accessToken,
    refreshToken
  });
};
