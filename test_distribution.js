
function calculatePaymentDistribution(totalAmount, startMonth, startYear, rentAmount) {
    if (totalAmount <= 0 || rentAmount <= 0) return []

    const distribution = []
    let remaining = totalAmount
    let currentMonth = startMonth
    let currentYear = startYear

    console.log(`Debug: Total=${totalAmount}, Rent=${rentAmount}`)

    while (remaining > 0.01) {
        // Log status
        console.log(`  Loop: Remaining=${remaining}, Month=${currentMonth}/${currentYear}`)

        const allocatable = Math.min(remaining, rentAmount)
        
        distribution.push({
            month: currentMonth,
            year: currentYear,
            amount: parseFloat(allocatable.toFixed(2)),
            isFull: allocatable >= (rentAmount - 0.01)
        })

        remaining -= allocatable
        
        currentMonth++
        if (currentMonth > 12) {
            currentMonth = 1
            currentYear++
        }
    }

    return distribution
}

// Test Case 1: USD Normal (2 months)
// Rent 100, Pay 200
console.log("--- Case 1: USD 200 vs Rent 100 ---")
console.log(calculatePaymentDistribution(200, 1, 2025, 100))

// Test Case 2: VES Normal (2 months equiv)
// Rent 100 USD. Rate 50. RentVES = 5000. Pay 10000 VES.
console.log("\n--- Case 2: VES 10000 vs RentVES 5000 ---")
console.log(calculatePaymentDistribution(10000, 1, 2025, 5000))

// Test Case 3: VES Bug Reproduction attempt
// Maybe float precision?
// Rent 100. Rate 54.23. RentVES = 5423. Pay 10846.
console.log("\n--- Case 3: VES 10846 vs RentVES 5423 ---")
console.log(calculatePaymentDistribution(10846, 1, 2025, 5423))

// Test Case 4: VES Partial
// Rent 100 USD. Rate 50. RentVES = 5000. Pay 7500.
console.log("\n--- Case 4: VES 7500 vs RentVES 5000 ---")
console.log(calculatePaymentDistribution(7500, 1, 2025, 5000))

// Test Case 5: The "No Division" Scenario
// If RentVES is erroneously large, e.g. 10000
console.log("\n--- Case 5: VES 10000 vs RentVES 10000 (Bug?) ---")
console.log(calculatePaymentDistribution(10000, 1, 2025, 10000))

