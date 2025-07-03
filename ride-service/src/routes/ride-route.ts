import { Router ,Request,Response } from "express";
import { bookRide, confirmRide, createRide, deleteRide, generateRideOTP, getallrides, getDriverRequests, getRideById, getridesbyDriverId, getUserBookingRequests, handleBookingRequest, updateRide } from "../controller/ride-controller";
import { authenticateRequest } from "../middleware/authvalidate";
import { Ride } from "../model/Ride";


const Riderouter = Router();



Riderouter.get('/search',async (req:Request,res:Response)=>{
    try{
        await getallrides(req,res);
    }catch{
        res.status(500).json({error:'internal error'})
    }
})


Riderouter.get("/:id", async (req: Request, res: Response) => {
    try {
        await getRideById(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}
);


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

Riderouter.get("/driver/my-rides", async (req: Request, res: Response) => {
    try {
        await getridesbyDriverId(req, res);
    }catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});


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



Riderouter.post("/book/:id", async (req: Request, res: Response) => {
    try {
        // Assuming you have a bookRide function in your controller
        await bookRide(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
}
);


Riderouter.get('/:rideId/booking-status', async (req: Request, res: Response) => {
    try {
        await getUserBookingRequests(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
})

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

Riderouter.post('/:rideId/generate-otp', async (req: Request, res: Response) => {
    try {
        await generateRideOTP(req, res);
    }catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

Riderouter.post('/confirmotp/:rideId', async (req: Request, res: Response) => {
    try {
        await confirmRide(req, res);
    }catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
})

// Export the router
export default Riderouter;