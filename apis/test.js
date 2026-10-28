async function testSettings() {
    try {
        console.log("Logging in...");
        const loginRes = await fetch('http://localhost:1977/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emailOrMobile: 'admin@bluepay.com', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        const token = loginData.token || loginData.accessToken;
        console.log("Token:", token ? "Got token" : "Failed to get token", loginData);

        if (!token) return;

        console.log("Fetching settings...");
        const settingsRes = await fetch('http://localhost:1977/api/settings', {
            method: 'GET',
            headers: { 'x-auth-token': token }
        });

        if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            console.log("Settings fetched successfully:", settingsData);
        } else {
            console.error("Error fetching settings:", settingsRes.status, await settingsRes.text());
        }
    } catch (e) {
        console.error("Error:", e);
    }
}
testSettings();
