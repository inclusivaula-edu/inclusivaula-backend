import {
  getDashboardData
} from "../services/dashboard.service.js";

// ✅ dashboard IA
export const getDashboardController = async (req, res) => {
  try {

    const dashboard =
      await getDashboardData();

    return res.json({
      success: true,
      data: dashboard
    });

  } catch (error) {

    console.error(
      "❌ getDashboard:",
      error.message
    );

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};