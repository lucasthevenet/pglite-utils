import { getServerSession } from '../auth';
import { prisma } from '../db'

// https://nuxt.com/docs/guide/directory-structure/server
export default defineEventHandler(async (event) => {
    const session = await getServerSession(event);

    if (!session?.user) {
       throw createError({
            statusCode: 401,
            statusMessage: "Unauthorized",
       })
    }
    
    const posts = await prisma.post.findMany({
        where: { 
            published: false,
            authorId: session.user.id
        },
        include: {
            author: true
        }
    });

    return posts;
});