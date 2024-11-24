import { Router } from "express";

const router: Router = Router();

router.post("/login", (_req, res) => {
	res.send("Login endpoint");
});

export { router as authRoutes };
