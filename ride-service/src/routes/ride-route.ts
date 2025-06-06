import { Router ,Request,Response } from "express";
import { bookRide, createRide, deleteRide, getDriverRequests, getRideById, handleBookingRequest, updateRide } from "../controller/ride-controller";
import { authenticateRequest } from "../middleware/authvalidate";
import { Ride } from "../model/Ride";


const Riderouter = Router();

//@ts-ignore
Riderouter.use(authenticateRequest);

Riderouter.post("/create", async (req: Request, res: Response) => {
    try {
        await createRide(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}
);


Riderouter.put("/update/:id", async (req: Request, res: Response) => {
    try {
        await updateRide(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}
);


Riderouter.delete("/delete/:id", async (req: Request, res: Response) => {
    try {
        await deleteRide(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}
);


Riderouter.get("/:id", async (req: Request, res: Response) => {
    try {
        await getRideById(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}
);

Riderouter.post("/book/:id", async (req: Request, res: Response) => {
    try {
        // Assuming you have a bookRide function in your controller
        await bookRide(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}
);

Riderouter.get('/driver/booking-request', async (req: Request, res: Response) => {
    try{
        await getDriverRequests(req, res);
    }catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}
);


Riderouter.patch('/booking-request/:requestId/respond', async (req: Request, res: Response) => {
    try{
        await handleBookingRequest(req, res);
    }catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Export the router
export default Riderouter;