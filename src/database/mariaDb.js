// const mariadb = require('mariadb');

// // const pool = mariadb.createPool({
// //     host: 'localhost',
// //     port: 3306,
// //     user: 'root',
// //     password: 'LatestMagicbricks@6000',
// //     database: 'aman',
// //     connectionLimit: 25,
// //     acquireTimeout: 30000, // 30 seconds
// //     connectTimeout: 30000,
// //     idleTimeout: 10,
// //     validationQuery: "SELECT 1"
// // });

// // Testing Env Config
// const pool = mariadb.createPool({
//     host: '172.29.129.14',
//     port: 3311,
//     user: 'apptesting_user',
//     password: 'App123Test@r321',
//     database: 'connexus',
//     connectionLimit: 25,
//     acquireTimeout: 30000, // 30 seconds
//     connectTimeout: 30000,
//     idleTimeout: 10,
//     validationQuery: "SELECT 1"
// });

// const query = async (sql, params) => {
//     let conn;
//     try {
//         conn = await pool.getConnection();
//         const result = await conn.query(sql, params);
//         return result;
//     } catch (err) {
//         console.log("err in mariadb",err);
//         throw err.message;
//     } finally {
//         if (conn) conn.end();
//     }
// };

// // Health Check Function
// const healthCheck = async () => {
//     let conn;
//     try {
//         conn = await pool.getConnection();
//         await conn.query('SELECT 1'); // Test query
//         console.log('Database connection is healthy.');
//         return { status: 'UP', message: 'Database is connected.' };
//     } catch (err) {
//         console.error('Database connection failed:', err.message);
//         return { status: 'DOWN', message: 'Database connection failed.', error: err.message };
//     } finally {
//         if (conn) conn.end();
//     }
// };

// const connectionCheck = async () => {
//     let connection = null; // Initialize as null for better handling
//     try {
//         connection = await pool.getConnection();
//         console.log("Connection of MariaDB connected successfull");
//     } catch (error) {
//         console.error("Error establishing connection:", error.message);
//         throw error;
//     } finally {
//         // Safely release the connection only if it was successfully acquired
//         if (connection) {
//             connection.release();
//             console.log("Connection of MariaDB released successfully");
//         }
//     }
// };

// connectionCheck();

// module.exports = { query, healthCheck };
