import { generateAlerts } from "../services/alert.service.js";
import { internalError } from "../utils/sanitize.js";

export const getAlertsController = async (req, res) => {
  try {
    const alerts = await generateAlerts(req.schoolId);
    return res.json({ success: true, total: alerts.length, data: alerts });
  } catch (error) {
    console.error("getAlerts:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};
