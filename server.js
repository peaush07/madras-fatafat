// Route to handle admin password changes securely
app.post('/api/change-password', async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
        return res.json({ success: false, message: "New passwords do not match!" });
    }

    try {
        const adminSettings = await Admin.findOne({}); 
        if (!adminSettings) {
            return res.json({ success: false, message: "Admin configuration not found." });
        }

        if (adminSettings.password !== oldPassword) {
            return res.json({ success: false, message: "Incorrect current password!" });
        }

        adminSettings.password = newPassword;
        await adminSettings.save();

        res.json({ success: true, message: "Password updated successfully in MongoDB! 🎉" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Database error: " + err.message });
    }
});
