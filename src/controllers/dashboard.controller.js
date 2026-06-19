import { getDashboardData } from "../services/dashboard.service.js";
import { internalError } from "../utils/sanitize.js";

export const getDashboardController = async (req, res) => {
  try {
    const dashboard = await getDashboardData(req.schoolId);
    return res.json({ success: true, data: dashboard });
  } catch (error) {
    console.error("getDashboard:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};
