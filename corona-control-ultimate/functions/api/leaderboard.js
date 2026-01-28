/**
 * functions/api/leaderboard.js
 * Example Cloudflare Pages Function for Leaderboard API
 */

export async function onRequestGet(context) {
    // In a real scenario, fetch from KV or D1
    const mockLeaderboard = [
        { name: "Stefan", score: 1000 },
        { name: "Maria", score: 850 },
        { name: "Heinrich", score: 720 },
    ];

    return new Response(JSON.stringify(mockLeaderboard), {
        headers: { "Content-Type": "application/json" }
    });
}
