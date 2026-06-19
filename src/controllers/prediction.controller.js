import { generatePredictions } from "../services/prediction.service.js";
import { internalError } from "../utils/sanitize.js";

export const getPredictionsController = async (req, res) => {
  try {
    const predictions = await generatePredictions(req.schoolId);
    return res.json({ success: true, total: predictions.length, data: predictions });
  } catch (error) {
    console.error("getPredictions:", error.message);
    return res.status(500).json({ success: false, error: internalError(error) });
  }
};
