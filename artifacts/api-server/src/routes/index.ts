import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import promptForgeRouter from "./prompt-forge";

const router: IRouter = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(promptForgeRouter);

export default router;
