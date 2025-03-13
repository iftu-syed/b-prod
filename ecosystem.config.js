module.exports = {
    apps: [
      {
        name: "api-password-setup",
        script: "./app.js",
        cwd: "./api_password_setup",  // ✅ Set correct working directory
        watch: true,
      },
      {
        name: "login-flow",
        script: "./app.js",
        cwd: "./login_flow",  // ✅ Set correct working directory
        watch: true,
      },
      {
        name: "dashboard",
        script: "./server.js",
        cwd: "./dashboard",  // ✅ Ensures it loads dashboard/.env
        watch: true,
      },
      {
        name: "privacy-policy",
        script: "./server.js",
        cwd: "./privacy-policy",
        watch: true,
      },
      {
        name: "hospital",
        script: "./server.js",
        cwd: "./Hospital",
        watch: true,
      },
      {
        name: "superadmin",
        script: "./server.js",
        cwd: "./Super-Admin",  // ✅ Now it will load Super-Admin/.env
        watch: true,
      },
      {
        name: "proms",
        script: "./server.js",
        cwd: "./proms",
        watch: true,
      },
      {
        name: "doctor-login-page",
        script: "./app.js",
        cwd: "./proms/Doctor_Login_Page",
        watch: true,
      },
      {
        name: "PROMIS-API-IMPLEMENTATION",
        script: "./proxy.js",
        cwd: "./proms/PROMIS_API_IMPLEMENTATION",
        watch: true,
      }
    ]
  };
 
