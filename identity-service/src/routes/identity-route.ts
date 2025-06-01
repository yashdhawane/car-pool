import { Router, Request, Response } from "express";
import { changeuserRole, loginUser, logoutUser, refreshTokenUser, registerUser } from "../controller/identity-controller";
import { validateToken } from "../middleware/authvalidate";

const Authrouter = Router(); // ✅ use Router() from express


Authrouter.post("/register", async (req: Request, res: Response) => {
    try {
        await registerUser(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

Authrouter.post("/login", async (req: Request, res: Response) => {
    try {
        // Implement login logic here
       await loginUser(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

Authrouter.post("/refresh-token", async (req: Request, res: Response) => {
    try {
        // Implement refresh token logic here
       await refreshTokenUser(req, res);
       
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

Authrouter.post("/logout", async (req: Request, res: Response) => {
    try {
        // Implement logout logic here
        // Assuming you have a logoutUser function in your controller
        await logoutUser(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

//@ts-ignore
Authrouter.post("/changerole", validateToken , async (req: Request, res: Response) => {
    try {
        // Implement logout logic here
        // Assuming you have a logoutUser function in your controller
        await changeuserRole(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});



export default Authrouter;
