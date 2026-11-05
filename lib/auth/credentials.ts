import {z} from 'zod';
export const loginCredentials=z.object({email:z.string().trim().toLowerCase().pipe(z.email()),password:z.string().min(1).max(1024)});
