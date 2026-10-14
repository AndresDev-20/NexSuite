import axios from "axios";
import { useState } from "react";
import getConfingToken from "../utils/getConfingToken";

const Api = import.meta.env.VITE_REACT_APP_URL;

const useAuthentication = () => {
   const [User, setUser] = useState()

    const getUser = () => {
      axios.get(`${Api}/users`, getConfingToken())
         .then(res => {
            setUser(res.data)
         })
         .catch(err => {
            console.log(err);
            
         })
    }

    const logginUser = async (data) => {
    // Agregamos el "return" antes de axios
    return await axios.post(`${Api}/users/login`, data)
         .then(res => {
            sessionStorage.setItem("token", res.data.Token); 
            sessionStorage.setItem("user", JSON.stringify(res.data.user));
            console.log(res.data)
            return res.data; 
         })
         .catch(err => {
            console.error("Error en login:", err.response?.data || err.message);
            throw err;
         });
}


    return { logginUser, User, getUser }
}

export default useAuthentication;