import { prisma } from '../../db'

// https://nuxt.com/docs/guide/directory-structure/server
export default defineEventHandler(async (event) => {
    const id = event.context.params?.id;
   
    const getPost = await prisma.post.findUnique({
        where: {
            id: id
        },
        include: { 
            author: true
        } 
    })
    .catch((error) => {
        console.error(error);
    });

    return getPost;
});