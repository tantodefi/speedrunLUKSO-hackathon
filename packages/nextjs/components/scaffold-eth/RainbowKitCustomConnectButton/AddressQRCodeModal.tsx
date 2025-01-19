import { QRCodeSVG } from "qrcode.react";
import { Address as AddressType, getAddress } from "viem";
import { Address } from "~~/components/scaffold-eth";
import { useProfile } from "~~/hooks/scaffold-eth/useProfile";

type AddressQRCodeModalProps = {
  address: AddressType;
  modalId: string;
};

export const AddressQRCodeModal = ({ address, modalId }: AddressQRCodeModalProps) => {
  const checkSumAddress = getAddress(address);
  const { profileImage: upImage, isUniversalProfile } = useProfile(checkSumAddress);

  return (
    <>
      <div>
        <input type="checkbox" id={`${modalId}`} className="modal-toggle" />
        <label htmlFor={`${modalId}`} className="modal cursor-pointer">
          <label className="modal-box relative">
            {/* dummy input to capture event onclick on modal box */}
            <input className="h-0 w-0 absolute top-0 left-0" />
            <label htmlFor={`${modalId}`} className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3">
              ✕
            </label>
            <div className="space-y-3 py-6">
              <div className="flex flex-col items-center gap-6">
                <div className="relative w-[256px] h-[256px] flex items-center justify-center">
                  {isUniversalProfile && upImage && (
                    <div
                      className="absolute inset-0 opacity-20"
                      style={{
                        backgroundImage: `url(${upImage})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        filter: "blur(2px) saturate(150%)",
                      }}
                    />
                  )}
                  <div className="relative z-10 bg-white bg-opacity-80 p-2 rounded-xl">
                    <QRCodeSVG value={address} size={232} />
                  </div>
                </div>
                <Address address={address} format="long" disableAddressLink />
              </div>
            </div>
          </label>
        </label>
      </div>
    </>
  );
};
