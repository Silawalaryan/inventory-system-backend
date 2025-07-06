// try {
//       const response = await fetch("/api/v1/items/addNewItem", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json", // <-- MISSING
//         },
//         body: JSON.stringify({
//           name: "check-computer",
//           category: "computer",
//           subCategory: "lenovo",
//           floor: "floor 1",
//           room: "room 1",
//           status: "In use",
//           source: "Purchase",
//           acquiredDate: "2025:07:01",
//           price: 5000,
//           description: "a computer",
//           count: 1,
//         }),
//       });
//       const json = await response.json();
//       console.log(json);
//     } catch (error) {
//       console.log(error);
//     }
//   }


//   server: {
//     proxy: {
//       "/api": "http://localhost:3000",
//     },
//   },