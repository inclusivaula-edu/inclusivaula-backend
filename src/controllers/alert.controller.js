import {
  generateAlerts
} from "../services/alert.service.js";

export const getAlertsController = async (req, res) => {
  try {

    const alerts =
      await generateAlerts();

    return res.json({
      success: true,
      total: alerts.length,
      data: alerts
    });

  } catch (error) {

    console.error(
      "❌ getAlerts:",
      error.message
    );

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};