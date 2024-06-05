import { getServerSession } from '~/server/auth';
import { prisma } from '../../db'

// https://nuxt.com/docs/guide/directory-structure/server
export default defineEventHandler(async (event) => {
    // https://nuxt.com/docs/guide/directory-structure/server#handling-requests-with-body
    const { title, content } = await readBody(event);
    const session = await getServerSession(event);

    if (!session?.user?.email) {
       throw createError({
            statusCode: 401,
            statusMessage: "Unauthorized",
       })
    }

    const createPost = await prisma.post.create({
        data: {
            title,
            content,
            published: false,
            author: {
                connect: {
                    email: session?.user.email
                }
            }
        }
    })
    .catch((error) => {
        console.error(error);
    });

    return createPost;
});