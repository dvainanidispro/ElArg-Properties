import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
import { join } from 'path';
import log from '../logger.js';

const execAsync = promisify(exec);

// A Windows absolute path. Example: W:\Development\ElArg-backup
const backupDestination = process.env.BACKUPFOLDER;

/**
 * Takes a backup of the PostgreSQL database using pg_dump
 * @returns {Promise<void>}
 */
async function takeDatabaseBackup() {
    try {
        // Validate environment variables
        if (!backupDestination) {
            throw new Error('BACKUPFOLDER environment variable is not set');
        }

        if (!process.env.DATABASEHOST || !process.env.DATABASENAME || 
            !process.env.DATABASEBACKUPUSERNAME || !process.env.DATABASEBACKUPPASSWORD) {
            throw new Error('Database backup environment variables are not set');
        }

        // Check if backup folder exists
        if (!existsSync(backupDestination)) {
            log.info('Backup folder does not exist, exiting...', false);
            process.exit(1);
        }

        // Generate filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const filename = `${process.env.DATABASENAME}_backup_${timestamp}.sql`;
        const backupPath = join(backupDestination, filename);

        log.info(`Starting database backup...`, false);
        log.info(`Database: ${process.env.DATABASENAME}`, false);
        log.info(`Backup location: ${backupDestination}`, false);

        // Prepare pg_dump command
        // -F p: plain text format, -F c: custom format (compressed)
        const pgDumpCommand = `pg_dump -h ${process.env.DATABASEHOST} -p ${process.env.DATABASEPORT} -U ${process.env.DATABASEBACKUPUSERNAME} -d ${process.env.DATABASENAME} -F p -b -v -f "${backupPath}"`;

        // Set PGPASSWORD environment variable for authentication
        // pg_dump uses specifically the PGPASSWORD variable
        const env = { ...process.env, PGPASSWORD: process.env.DATABASEBACKUPPASSWORD };

        // Execute pg_dump with the env object as environment
        const { stdout, stderr } = await execAsync(pgDumpCommand, { env, maxBuffer: 1024 * 1024 * 10 });

        if (stderr && !stderr.includes('pg_dump:')) {
            log.warn('Backup completed with warnings:', false);
            log.warn(stderr, false);
        }

        log.success(`Database backup completed successfully!`, false);
        log.success(`Backup saved to: ${backupPath}`, false);

        return backupPath;

    } catch (error) {
        log.error(`Database backup failed: ${error.message}`, false);
        throw error;
    }
}

// Execute backup when script is run directly
takeDatabaseBackup()
    .then(() => {
        setTimeout(() => {
            process.exit(0);
        }, 3000);
    })
    .catch((error) => {
        console.error('Error taking database backup:', error);
        setTimeout(() => {
            process.exit(1);
        }, 3000);
    });

