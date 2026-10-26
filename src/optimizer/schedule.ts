// Builds each technician's route for a day. Jobs have a time window, a required skill
// and a duration; technicians have skills, a home base and working hours.
export type Job = { id: string; lat: number; lng: number; windowStart: number; windowEnd: number; minutes: number; skill: string };
export type Technician = { id: string; skills: string[]; startMin: number; endMin: number; home: { lat: number; lng: number } };
export type Stop = { jobId: string; arriveMin: number; leaveMin: number };

const AVG_KMH = 38;

function driveMinutes(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const km = Math.hypot(a.lat - b.lat, (a.lng - b.lng) * Math.cos((a.lat * Math.PI) / 180)) * 111;
  return Math.ceil((km / AVG_KMH) * 60);
}

/** Greedy nearest-feasible-job routing; the local search pass runs afterwards. */
export function planRoute(tech: Technician, jobs: Job[]): Stop[] {
  const stops: Stop[] = [];
  let here = tech.home;
  let clock = tech.startMin;
  const left = jobs.filter((j) => tech.skills.includes(j.skill));
  while (left.length > 0) {
    let best = -1;
    let bestArrive = Infinity;
    for (let i = 0; i < left.length; i++) {
      const arrive = Math.max(clock + driveMinutes(here, left[i]), left[i].windowStart);
      if (arrive + left[i].minutes <= Math.min(left[i].windowEnd, tech.endMin) && arrive < bestArrive) {
        best = i;
        bestArrive = arrive;
      }
    }
    if (best < 0) break;
    const job = left.splice(best, 1)[0];
    stops.push({ jobId: job.id, arriveMin: bestArrive, leaveMin: bestArrive + job.minutes });
    clock = bestArrive + job.minutes;
    here = job;
  }
  // TODO: technician breaks and lunch windows (v2.6).
  return stops;
}
