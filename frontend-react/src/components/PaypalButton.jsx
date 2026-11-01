import { PayPalButtons } from "@paypal/react-paypal-js";
import Swal from "sweetalert2";

const PaypalButton = ({ totalAmount, onSuccess }) => {
    return (
        <PayPalButtons
            style={{ layout: "vertical" }}
            createOrder={(data, actions) => {
                return actions.order.create({
                    purchase_units: [
                        {
                            amount: {
                                // PayPal uses USD, so convert from VND using the current exchange rate.
                                value: (totalAmount / 25000).toFixed(2),
                            },
                        },
                    ],
                });
            }}
            onApprove={async (data, actions) => {
                const order = await actions.order.capture();
                console.log("Thanh toán thành công:", order);
                onSuccess(order); // Gọi hàm xử lý sau khi trả tiền xong
            }}
            onError={() => {
                Swal.fire("Error", "The PayPal transaction failed.", "error");
            }}
        />
    );
};

export default PaypalButton;