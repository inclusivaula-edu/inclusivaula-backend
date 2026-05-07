export const analyzeTrends = (data) => {

  const totalStudents = data.students.length;

  const avgScore =
    data.evaluations.length > 0
      ? data.evaluations.reduce(
          (acc, e) => acc + Number(e.score || 0),
          0
        ) / data.evaluations.length
      : 0;

  const attendanceRate =
    data.attendance.length > 0
      ? (data.attendance.filter(a => a.status === "present").length /
         data.attendance.length) * 100
      : 0;

  const inclusionRate =
    data.disabilities.length;

  return {
    totalStudents,
    avgScore: avgScore.toFixed(1),
    attendanceRate: attendanceRate.toFixed(0),
    inclusionRate
  };
};