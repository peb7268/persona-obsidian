// QuickAdd Macro Script: New Meeting
// Handles all prompts in script, then executes template with pre-filled variables
module.exports = async (params) => {
    const { quickAddApi } = params;

    // 1. Category selection (dropdown)
    const categories = ["1to1", "Ad-Hoc", "Leadership", "PandE", "Personal", "Scrum"];
    const category = await quickAddApi.suggester(categories, categories);
    if (!category) return; // User cancelled

    // 2. Subject input
    const subject = await quickAddApi.inputPrompt("Meeting Subject");
    if (!subject) return; // User cancelled

    // 3. People input (comma-separated)
    const peopleInput = await quickAddApi.inputPrompt("People (comma-separated, or leave blank)");

    let people = "";
    if (peopleInput && peopleInput.trim() !== "") {
        // Split by comma, trim whitespace, wrap in wikilinks
        people = peopleInput
            .split(",")
            .map(name => name.trim())
            .filter(name => name.length > 0)
            .map(name => `[[${name}]]`)
            .join(", ");
    }

    // 4. Execute template with all variables pre-filled
    await quickAddApi.executeChoice("Meeting Template Helper", {
        Category: category,
        Subject: subject,
        People: people
    });
};
