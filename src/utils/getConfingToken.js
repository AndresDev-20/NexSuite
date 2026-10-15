const getConfingToken = () => ({
    headers: {
        Authorization: `Bearer ${sessionStorage.getItem('token')}`
    }
})

export default getConfingToken