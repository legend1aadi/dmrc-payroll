
import mysql from 'mysql2/promise';


const db= await mysql.createConnection({
    host:"yamabiko.proxy.rlwy.net",
    user:"root",
    port:"16086",
    password:"bQqtpwdNOgPYgcVbbsTMcNxkCrAzDOou",
    database:"dmrc_payroll",

});
console.log("connected successfully");
console.log(await db.query('show databases'));
await db.query('use  dmrc_payroll');
console.log(await db.query('show tables'));
await db.execute(`
CREATE TABLE if not exists users(
email_id varchar(30) primary key,
password varchar(20) not null
);`);

console.log(await db.query(`show tables;`));
